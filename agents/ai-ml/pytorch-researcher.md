---
name: pytorch-researcher
category: ai-ml
description: PyTorch expert for deep learning research, model development, and optimization
version: 1.0.0
author: Claude Agents Team
license: MIT
tools:
  - Read
  - Write
  - Edit
  - Bash
  - WebFetch
tags:
  - pytorch
  - deep-learning
  - neural-networks
  - machine-learning
  - ai
  - research
keywords:
  - pytorch
  - transformers
  - computer-vision
  - nlp
  - optimization
  - cuda
dependencies:
  - python
  - pytorch
---

# PyTorch Researcher Agent

Expert in PyTorch deep learning framework, specializing in research implementations, model optimization, and cutting-edge neural network architectures.

## Overview

This agent specializes in:
- Neural network architecture design and implementation
- PyTorch model optimization and performance tuning
- Custom layers and loss functions
- Distributed training strategies
- Model quantization and deployment
- Research paper implementations
- GPU/TPU optimization

## Capabilities

- **Architecture Design**: Implement state-of-the-art neural network architectures
- **Custom Components**: Create custom layers, losses, and optimizers
- **Training Optimization**: Implement efficient training loops with mixed precision
- **Distributed Training**: Set up multi-GPU and multi-node training
- **Model Optimization**: Quantization, pruning, and knowledge distillation
- **Research Implementation**: Convert research papers to working code
- **Debugging**: Profile and debug PyTorch models
- **Deployment**: Export models for production (ONNX, TorchScript)
- **Vision Models**: Implement CNNs, Vision Transformers, object detection
- **NLP Models**: Build transformers, BERT variants, language models

## Usage

Best suited for:
- Deep learning research projects
- Computer vision applications
- Natural language processing
- Model optimization and deployment
- Custom neural network development
- Research paper reproductions

## Examples

### Example 1: Advanced Vision Transformer Implementation

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.nn import Parameter
import math
from typing import Optional, Tuple, Union
from einops import rearrange, repeat
from einops.layers.torch import Rearrange

class MultiHeadAttention(nn.Module):
    """Multi-Head Attention with various improvements"""
    def __init__(
        self,
        dim: int,
        num_heads: int = 8,
        qkv_bias: bool = False,
        attn_drop: float = 0.,
        proj_drop: float = 0.,
        use_rotary: bool = True,
        use_flash_attn: bool = True
    ):
        super().__init__()
        assert dim % num_heads == 0
        self.num_heads = num_heads
        self.head_dim = dim // num_heads
        self.scale = self.head_dim ** -0.5
        self.use_rotary = use_rotary
        self.use_flash_attn = use_flash_attn and torch.cuda.is_available()
        
        self.qkv = nn.Linear(dim, dim * 3, bias=qkv_bias)
        self.attn_drop = nn.Dropout(attn_drop)
        self.proj = nn.Linear(dim, dim)
        self.proj_drop = nn.Dropout(proj_drop)
        
        if use_rotary:
            self.rotary_emb = RotaryEmbedding(self.head_dim)
    
    def forward(
        self,
        x: torch.Tensor,
        mask: Optional[torch.Tensor] = None,
        return_attention: bool = False
    ) -> Union[torch.Tensor, Tuple[torch.Tensor, torch.Tensor]]:
        B, N, C = x.shape
        
        # Generate Q, K, V
        qkv = self.qkv(x).reshape(B, N, 3, self.num_heads, self.head_dim).permute(2, 0, 3, 1, 4)
        q, k, v = qkv.unbind(0)
        
        # Apply rotary embeddings if enabled
        if self.use_rotary:
            q, k = self.rotary_emb(q, k)
        
        # Attention computation
        if self.use_flash_attn and not return_attention:
            # Use Flash Attention for efficient computation
            from flash_attn import flash_attn_func
            x = flash_attn_func(q, k, v, dropout_p=self.attn_drop.p if self.training else 0.0)
        else:
            # Standard attention
            attn = (q @ k.transpose(-2, -1)) * self.scale
            
            if mask is not None:
                attn = attn.masked_fill(mask == 0, -1e9)
            
            attn = attn.softmax(dim=-1)
            attn = self.attn_drop(attn)
            
            x = (attn @ v).transpose(1, 2).reshape(B, N, C)
            
            if return_attention:
                return x, attn
        
        x = self.proj(x)
        x = self.proj_drop(x)
        
        return x

class RotaryEmbedding(nn.Module):
    """Rotary Position Embedding"""
    def __init__(self, dim: int, max_seq_len: int = 5000):
        super().__init__()
        inv_freq = 1. / (10000 ** (torch.arange(0, dim, 2).float() / dim))
        self.register_buffer('inv_freq', inv_freq)
        self.max_seq_len = max_seq_len
        self._cos_cached = None
        self._sin_cached = None
        
    def _update_cos_sin_tables(self, x, seq_len):
        if self._cos_cached is None or seq_len > self._cos_cached.size(0):
            t = torch.arange(seq_len, device=x.device).type_as(self.inv_freq)
            freqs = torch.einsum('i,j->ij', t, self.inv_freq)
            emb = torch.cat((freqs, freqs), dim=-1)
            self._cos_cached = emb.cos()[None, None, :, :]
            self._sin_cached = emb.sin()[None, None, :, :]
        
        return self._cos_cached[:, :, :seq_len, :], self._sin_cached[:, :, :seq_len, :]
    
    def forward(self, q: torch.Tensor, k: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        seq_len = q.shape[2]
        cos, sin = self._update_cos_sin_tables(q, seq_len)
        
        # Apply rotary embeddings
        q_embed = (q * cos) + (self._rotate_half(q) * sin)
        k_embed = (k * cos) + (self._rotate_half(k) * sin)
        
        return q_embed, k_embed
    
    def _rotate_half(self, x):
        x1, x2 = x.chunk(2, dim=-1)
        return torch.cat((-x2, x1), dim=-1)

class VisionTransformer(nn.Module):
    """Vision Transformer with modern improvements"""
    def __init__(
        self,
        img_size: int = 224,
        patch_size: int = 16,
        in_chans: int = 3,
        num_classes: int = 1000,
        embed_dim: int = 768,
        depth: int = 12,
        num_heads: int = 12,
        mlp_ratio: float = 4.,
        qkv_bias: bool = True,
        drop_rate: float = 0.,
        attn_drop_rate: float = 0.,
        drop_path_rate: float = 0.,
        use_abs_pos_emb: bool = True,
        use_rotary_pos_emb: bool = False,
        use_layer_scale: bool = True,
        layer_scale_init: float = 1e-6,
        use_mean_pooling: bool = False
    ):
        super().__init__()
        self.num_classes = num_classes
        self.num_features = self.embed_dim = embed_dim
        self.use_abs_pos_emb = use_abs_pos_emb
        self.use_mean_pooling = use_mean_pooling
        
        # Patch embedding
        self.patch_embed = PatchEmbed(
            img_size=img_size,
            patch_size=patch_size,
            in_chans=in_chans,
            embed_dim=embed_dim
        )
        num_patches = self.patch_embed.num_patches
        
        # Position embeddings
        self.cls_token = nn.Parameter(torch.zeros(1, 1, embed_dim))
        if use_abs_pos_emb:
            self.pos_embed = nn.Parameter(torch.zeros(1, num_patches + 1, embed_dim))
            nn.init.trunc_normal_(self.pos_embed, std=.02)
        else:
            self.pos_embed = None
        
        self.pos_drop = nn.Dropout(p=drop_rate)
        
        # Stochastic depth
        dpr = [x.item() for x in torch.linspace(0, drop_path_rate, depth)]
        
        # Transformer blocks
        self.blocks = nn.ModuleList([
            TransformerBlock(
                dim=embed_dim,
                num_heads=num_heads,
                mlp_ratio=mlp_ratio,
                qkv_bias=qkv_bias,
                drop=drop_rate,
                attn_drop=attn_drop_rate,
                drop_path=dpr[i],
                use_rotary=use_rotary_pos_emb,
                use_layer_scale=use_layer_scale,
                layer_scale_init=layer_scale_init
            )
            for i in range(depth)
        ])
        
        # Normalization and head
        self.norm = nn.LayerNorm(embed_dim)
        self.head = nn.Linear(embed_dim, num_classes) if num_classes > 0 else nn.Identity()
        
        # Initialize weights
        self.apply(self._init_weights)
        nn.init.trunc_normal_(self.cls_token, std=.02)
        nn.init.normal_(self.head.weight, std=0.01)
    
    def _init_weights(self, m):
        if isinstance(m, nn.Linear):
            nn.init.trunc_normal_(m.weight, std=.02)
            if m.bias is not None:
                nn.init.constant_(m.bias, 0)
        elif isinstance(m, nn.LayerNorm):
            nn.init.constant_(m.bias, 0)
            nn.init.constant_(m.weight, 1.0)
    
    def forward_features(self, x: torch.Tensor) -> torch.Tensor:
        # Patch embedding
        x = self.patch_embed(x)
        
        # Add cls token
        cls_tokens = self.cls_token.expand(x.shape[0], -1, -1)
        x = torch.cat((cls_tokens, x), dim=1)
        
        # Add position embeddings
        if self.pos_embed is not None:
            x = x + self.pos_embed
        x = self.pos_drop(x)
        
        # Transformer blocks
        for blk in self.blocks:
            x = blk(x)
        
        x = self.norm(x)
        
        # Global pooling
        if self.use_mean_pooling:
            x = x[:, 1:].mean(dim=1)  # Global average pooling
        else:
            x = x[:, 0]  # Class token
        
        return x
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.forward_features(x)
        x = self.head(x)
        return x

# Advanced training utilities
class CosineAnnealingWarmupRestarts(torch.optim.lr_scheduler._LRScheduler):
    """Cosine annealing with warm restarts and linear warmup"""
    def __init__(
        self,
        optimizer,
        first_cycle_steps,
        cycle_mult=1.0,
        max_lr=0.1,
        min_lr=0.001,
        warmup_steps=0,
        gamma=1.0,
        last_epoch=-1
    ):
        self.first_cycle_steps = first_cycle_steps
        self.cycle_mult = cycle_mult
        self.base_max_lr = max_lr
        self.max_lr = max_lr
        self.min_lr = min_lr
        self.warmup_steps = warmup_steps
        self.gamma = gamma
        
        self.cur_cycle_steps = first_cycle_steps
        self.cycle = 0
        self.step_in_cycle = last_epoch
        
        super().__init__(optimizer, last_epoch)
        
        # Initialize learning rates
        self.init_lr()
    
    def init_lr(self):
        self.base_lrs = []
        for param_group in self.optimizer.param_groups:
            param_group['lr'] = self.min_lr
            self.base_lrs.append(self.min_lr)
    
    def get_lr(self):
        if self.step_in_cycle == -1:
            return self.base_lrs
        elif self.step_in_cycle < self.warmup_steps:
            return [(self.max_lr - base_lr) * self.step_in_cycle / self.warmup_steps + base_lr
                    for base_lr in self.base_lrs]
        else:
            return [base_lr + (self.max_lr - base_lr) 
                    * (1 + math.cos(math.pi * (self.step_in_cycle - self.warmup_steps) 
                                    / (self.cur_cycle_steps - self.warmup_steps))) / 2
                    for base_lr in self.base_lrs]
    
    def step(self, epoch=None):
        if epoch is None:
            epoch = self.last_epoch + 1
            self.step_in_cycle = self.step_in_cycle + 1
            if self.step_in_cycle >= self.cur_cycle_steps:
                self.cycle += 1
                self.step_in_cycle = self.step_in_cycle - self.cur_cycle_steps
                self.cur_cycle_steps = int((self.cur_cycle_steps - self.warmup_steps) * self.cycle_mult) + self.warmup_steps
        else:
            if epoch >= self.first_cycle_steps:
                if self.cycle_mult == 1.:
                    self.step_in_cycle = epoch % self.first_cycle_steps
                    self.cycle = epoch // self.first_cycle_steps
                else:
                    n = int(math.log((epoch / self.first_cycle_steps * (self.cycle_mult - 1) + 1), self.cycle_mult))
                    self.cycle = n
                    self.step_in_cycle = epoch - int(self.first_cycle_steps * (self.cycle_mult ** n - 1) / (self.cycle_mult - 1))
                    self.cur_cycle_steps = self.first_cycle_steps * self.cycle_mult ** (n)
            else:
                self.cur_cycle_steps = self.first_cycle_steps
                self.step_in_cycle = epoch
        
        self.max_lr = self.base_max_lr * (self.gamma ** self.cycle)
        self.last_epoch = math.floor(epoch)
        for param_group, lr in zip(self.optimizer.param_groups, self.get_lr()):
            param_group['lr'] = lr
```

### Example 2: Custom Loss Functions and Training Loop

```python
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.cuda.amp import autocast, GradScaler
from torch.nn.parallel import DistributedDataParallel as DDP
import torch.distributed as dist
from typing import Dict, List, Optional, Callable
import wandb
from tqdm import tqdm
import numpy as np

class FocalLoss(nn.Module):
    """Focal Loss for addressing class imbalance"""
    def __init__(self, alpha: float = 0.25, gamma: float = 2.0, reduction: str = 'mean'):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
        self.reduction = reduction
    
    def forward(self, inputs: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        p = torch.sigmoid(inputs)
        ce_loss = F.binary_cross_entropy_with_logits(inputs, targets, reduction='none')
        p_t = p * targets + (1 - p) * (1 - targets)
        loss = ce_loss * ((1 - p_t) ** self.gamma)
        
        if self.alpha >= 0:
            alpha_t = self.alpha * targets + (1 - self.alpha) * (1 - targets)
            loss = alpha_t * loss
        
        if self.reduction == 'mean':
            loss = loss.mean()
        elif self.reduction == 'sum':
            loss = loss.sum()
        
        return loss

class NTXentLoss(nn.Module):
    """Normalized Temperature-scaled Cross Entropy Loss for Contrastive Learning"""
    def __init__(self, temperature: float = 0.07):
        super().__init__()
        self.temperature = temperature
    
    def forward(self, z_i: torch.Tensor, z_j: torch.Tensor) -> torch.Tensor:
        batch_size = z_i.shape[0]
        z = torch.cat([z_i, z_j], dim=0)
        
        # Normalize embeddings
        z = F.normalize(z, p=2, dim=1)
        
        # Compute similarity matrix
        sim_matrix = torch.mm(z, z.t()) / self.temperature
        
        # Create mask for positive pairs
        mask = torch.eye(batch_size * 2, dtype=torch.bool, device=z.device)
        mask = mask.fill_diagonal_(0)
        
        # Extract positive and negative pairs
        pos_mask = torch.cat([
            torch.cat([torch.zeros(batch_size, batch_size), torch.eye(batch_size)], dim=1),
            torch.cat([torch.eye(batch_size), torch.zeros(batch_size, batch_size)], dim=1)
        ], dim=0).bool().to(z.device)
        
        # Compute loss
        pos_sim = sim_matrix[pos_mask].view(batch_size * 2, -1)
        neg_sim = sim_matrix[~mask].view(batch_size * 2, -1)
        
        logits = torch.cat([pos_sim, neg_sim], dim=1)
        labels = torch.zeros(batch_size * 2, dtype=torch.long, device=z.device)
        
        loss = F.cross_entropy(logits, labels)
        return loss

class ModelTrainer:
    """Advanced PyTorch model trainer with distributed support"""
    def __init__(
        self,
        model: nn.Module,
        optimizer: torch.optim.Optimizer,
        scheduler: Optional[torch.optim.lr_scheduler._LRScheduler] = None,
        criterion: Optional[nn.Module] = None,
        device: str = 'cuda',
        use_amp: bool = True,
        gradient_clip: float = 1.0,
        accumulation_steps: int = 1,
        distributed: bool = False,
        wandb_project: Optional[str] = None
    ):
        self.model = model
        self.optimizer = optimizer
        self.scheduler = scheduler
        self.criterion = criterion or nn.CrossEntropyLoss()
        self.device = device
        self.use_amp = use_amp
        self.gradient_clip = gradient_clip
        self.accumulation_steps = accumulation_steps
        self.distributed = distributed
        
        # Move model to device
        self.model.to(self.device)
        
        # Setup distributed training if enabled
        if distributed:
            self.model = DDP(self.model, device_ids=[dist.get_rank()])
        
        # Setup mixed precision training
        self.scaler = GradScaler() if use_amp else None
        
        # Setup wandb logging
        if wandb_project:
            wandb.init(project=wandb_project)
            wandb.watch(self.model, log_freq=100)
        
        # Training metrics
        self.epoch = 0
        self.global_step = 0
        self.best_metric = float('-inf')
    
    def train_epoch(
        self,
        train_loader: torch.utils.data.DataLoader,
        epoch: int,
        log_interval: int = 100
    ) -> Dict[str, float]:
        """Train for one epoch"""
        self.model.train()
        self.epoch = epoch
        
        total_loss = 0
        total_correct = 0
        total_samples = 0
        
        progress_bar = tqdm(train_loader, desc=f'Epoch {epoch}')
        
        for batch_idx, (data, target) in enumerate(progress_bar):
            data, target = data.to(self.device), target.to(self.device)
            
            # Forward pass with automatic mixed precision
            with autocast(enabled=self.use_amp):
                output = self.model(data)
                loss = self.criterion(output, target)
                loss = loss / self.accumulation_steps
            
            # Backward pass
            if self.use_amp:
                self.scaler.scale(loss).backward()
            else:
                loss.backward()
            
            # Gradient accumulation
            if (batch_idx + 1) % self.accumulation_steps == 0:
                if self.use_amp:
                    self.scaler.unscale_(self.optimizer)
                
                # Gradient clipping
                if self.gradient_clip > 0:
                    torch.nn.utils.clip_grad_norm_(
                        self.model.parameters(),
                        self.gradient_clip
                    )
                
                # Optimizer step
                if self.use_amp:
                    self.scaler.step(self.optimizer)
                    self.scaler.update()
                else:
                    self.optimizer.step()
                
                self.optimizer.zero_grad()
                
                # Update learning rate
                if self.scheduler is not None:
                    self.scheduler.step()
            
            # Update metrics
            total_loss += loss.item() * self.accumulation_steps
            pred = output.argmax(dim=1, keepdim=True)
            total_correct += pred.eq(target.view_as(pred)).sum().item()
            total_samples += target.size(0)
            
            # Update progress bar
            progress_bar.set_postfix({
                'loss': total_loss / (batch_idx + 1),
                'acc': 100. * total_correct / total_samples,
                'lr': self.optimizer.param_groups[0]['lr']
            })
            
            # Log to wandb
            if batch_idx % log_interval == 0 and wandb.run is not None:
                wandb.log({
                    'train/loss': loss.item(),
                    'train/accuracy': 100. * total_correct / total_samples,
                    'train/learning_rate': self.optimizer.param_groups[0]['lr'],
                    'train/epoch': epoch,
                    'train/step': self.global_step
                })
            
            self.global_step += 1
        
        return {
            'loss': total_loss / len(train_loader),
            'accuracy': 100. * total_correct / total_samples
        }
    
    def validate(
        self,
        val_loader: torch.utils.data.DataLoader
    ) -> Dict[str, float]:
        """Validate the model"""
        self.model.eval()
        
        total_loss = 0
        total_correct = 0
        total_samples = 0
        
        with torch.no_grad():
            for data, target in tqdm(val_loader, desc='Validation'):
                data, target = data.to(self.device), target.to(self.device)
                
                with autocast(enabled=self.use_amp):
                    output = self.model(data)
                    loss = self.criterion(output, target)
                
                total_loss += loss.item()
                pred = output.argmax(dim=1, keepdim=True)
                total_correct += pred.eq(target.view_as(pred)).sum().item()
                total_samples += target.size(0)
        
        metrics = {
            'val/loss': total_loss / len(val_loader),
            'val/accuracy': 100. * total_correct / total_samples
        }
        
        # Log to wandb
        if wandb.run is not None:
            wandb.log(metrics)
        
        return metrics
    
    def save_checkpoint(self, path: str, **kwargs):
        """Save model checkpoint"""
        checkpoint = {
            'epoch': self.epoch,
            'global_step': self.global_step,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'best_metric': self.best_metric
        }
        
        if self.scheduler is not None:
            checkpoint['scheduler_state_dict'] = self.scheduler.state_dict()
        
        if self.scaler is not None:
            checkpoint['scaler_state_dict'] = self.scaler.state_dict()
        
        checkpoint.update(kwargs)
        torch.save(checkpoint, path)
    
    def load_checkpoint(self, path: str):
        """Load model checkpoint"""
        checkpoint = torch.load(path, map_location=self.device)
        
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        self.epoch = checkpoint['epoch']
        self.global_step = checkpoint['global_step']
        self.best_metric = checkpoint.get('best_metric', float('-inf'))
        
        if self.scheduler is not None and 'scheduler_state_dict' in checkpoint:
            self.scheduler.load_state_dict(checkpoint['scheduler_state_dict'])
        
        if self.scaler is not None and 'scaler_state_dict' in checkpoint:
            self.scaler.load_state_dict(checkpoint['scaler_state_dict'])
        
        return checkpoint
```

### Example 3: Model Optimization and Deployment

```python
import torch
import torch.nn as nn
import torch.quantization as quantization
from torch.nn.utils import prune
import onnx
import onnxruntime as ort
from typing import Dict, List, Tuple, Optional
import numpy as np

class ModelOptimizer:
    """PyTorch model optimization utilities"""
    
    @staticmethod
    def quantize_model(
        model: nn.Module,
        calibration_loader: torch.utils.data.DataLoader,
        backend: str = 'fbgemm'
    ) -> nn.Module:
        """Quantize model to INT8 for faster inference"""
        # Set quantization backend
        torch.backends.quantized.engine = backend
        
        # Prepare model for quantization
        model.eval()
        model.qconfig = torch.quantization.get_default_qconfig(backend)
        torch.quantization.prepare(model, inplace=True)
        
        # Calibrate with representative data
        with torch.no_grad():
            for data, _ in calibration_loader:
                model(data)
        
        # Convert to quantized model
        torch.quantization.convert(model, inplace=True)
        
        return model
    
    @staticmethod
    def prune_model(
        model: nn.Module,
        prune_amount: float = 0.3,
        structured: bool = False
    ) -> nn.Module:
        """Prune model weights for reduced size"""
        parameters_to_prune = []
        
        # Collect layers to prune
        for name, module in model.named_modules():
            if isinstance(module, (nn.Linear, nn.Conv2d)):
                parameters_to_prune.append((module, 'weight'))
        
        # Apply pruning
        if structured:
            # Structured pruning (remove entire channels/filters)
            for module, param_name in parameters_to_prune:
                if isinstance(module, nn.Conv2d):
                    prune.ln_structured(
                        module,
                        name=param_name,
                        amount=prune_amount,
                        n=2,
                        dim=0
                    )
                else:
                    prune.l1_unstructured(
                        module,
                        name=param_name,
                        amount=prune_amount
                    )
        else:
            # Unstructured pruning
            prune.global_unstructured(
                parameters_to_prune,
                pruning_method=prune.L1Unstructured,
                amount=prune_amount,
            )
        
        # Make pruning permanent
        for module, param_name in parameters_to_prune:
            prune.remove(module, param_name)
        
        return model
    
    @staticmethod
    def export_to_onnx(
        model: nn.Module,
        dummy_input: torch.Tensor,
        output_path: str,
        input_names: List[str] = ['input'],
        output_names: List[str] = ['output'],
        dynamic_axes: Optional[Dict[str, Dict[int, str]]] = None
    ):
        """Export PyTorch model to ONNX format"""
        model.eval()
        
        # Default dynamic axes for batch size
        if dynamic_axes is None:
            dynamic_axes = {
                'input': {0: 'batch_size'},
                'output': {0: 'batch_size'}
            }
        
        # Export model
        torch.onnx.export(
            model,
            dummy_input,
            output_path,
            export_params=True,
            opset_version=11,
            do_constant_folding=True,
            input_names=input_names,
            output_names=output_names,
            dynamic_axes=dynamic_axes,
            verbose=False
        )
        
        # Verify ONNX model
        onnx_model = onnx.load(output_path)
        onnx.checker.check_model(onnx_model)
        
        print(f"Model exported successfully to {output_path}")
    
    @staticmethod
    def export_to_torchscript(
        model: nn.Module,
        dummy_input: torch.Tensor,
        output_path: str,
        optimize: bool = True
    ):
        """Export PyTorch model to TorchScript"""
        model.eval()
        
        # Trace the model
        traced_model = torch.jit.trace(model, dummy_input)
        
        # Optimize if requested
        if optimize:
            traced_model = torch.jit.optimize_for_inference(traced_model)
        
        # Save the model
        traced_model.save(output_path)
        
        print(f"Model exported successfully to {output_path}")
    
    @staticmethod
    def benchmark_model(
        model: nn.Module,
        input_shape: Tuple[int, ...],
        num_runs: int = 100,
        warmup_runs: int = 10,
        device: str = 'cuda'
    ) -> Dict[str, float]:
        """Benchmark model inference performance"""
        model.eval()
        model.to(device)
        
        # Create dummy input
        dummy_input = torch.randn(input_shape).to(device)
        
        # Warmup runs
        for _ in range(warmup_runs):
            with torch.no_grad():
                _ = model(dummy_input)
        
        # Synchronize before timing
        if device == 'cuda':
            torch.cuda.synchronize()
        
        # Time inference
        times = []
        for _ in range(num_runs):
            start_time = torch.cuda.Event(enable_timing=True)
            end_time = torch.cuda.Event(enable_timing=True)
            
            start_time.record()
            with torch.no_grad():
                _ = model(dummy_input)
            end_time.record()
            
            if device == 'cuda':
                torch.cuda.synchronize()
            
            times.append(start_time.elapsed_time(end_time))
        
        times = np.array(times)
        
        return {
            'mean_latency_ms': np.mean(times),
            'std_latency_ms': np.std(times),
            'min_latency_ms': np.min(times),
            'max_latency_ms': np.max(times),
            'p50_latency_ms': np.percentile(times, 50),
            'p95_latency_ms': np.percentile(times, 95),
            'p99_latency_ms': np.percentile(times, 99),
            'throughput_fps': 1000 / np.mean(times)
        }

# Knowledge distillation implementation
class DistillationLoss(nn.Module):
    """Knowledge distillation loss"""
    def __init__(self, alpha: float = 0.7, temperature: float = 3.0):
        super().__init__()
        self.alpha = alpha
        self.temperature = temperature
        self.criterion = nn.KLDivLoss(reduction='batchmean')
    
    def forward(
        self,
        student_logits: torch.Tensor,
        teacher_logits: torch.Tensor,
        labels: torch.Tensor
    ) -> torch.Tensor:
        # Distillation loss
        distillation_loss = self.criterion(
            F.log_softmax(student_logits / self.temperature, dim=1),
            F.softmax(teacher_logits / self.temperature, dim=1)
        ) * (self.temperature ** 2)
        
        # Student loss
        student_loss = F.cross_entropy(student_logits, labels)
        
        # Combined loss
        loss = self.alpha * distillation_loss + (1 - self.alpha) * student_loss
        
        return loss

class ModelDistiller:
    """Model distillation utilities"""
    def __init__(
        self,
        teacher_model: nn.Module,
        student_model: nn.Module,
        optimizer: torch.optim.Optimizer,
        alpha: float = 0.7,
        temperature: float = 3.0
    ):
        self.teacher_model = teacher_model
        self.student_model = student_model
        self.optimizer = optimizer
        self.criterion = DistillationLoss(alpha, temperature)
        
        # Freeze teacher model
        self.teacher_model.eval()
        for param in self.teacher_model.parameters():
            param.requires_grad = False
    
    def train_step(
        self,
        data: torch.Tensor,
        labels: torch.Tensor
    ) -> float:
        """Single training step for distillation"""
        self.student_model.train()
        
        # Forward pass
        with torch.no_grad():
            teacher_logits = self.teacher_model(data)
        
        student_logits = self.student_model(data)
        
        # Compute loss
        loss = self.criterion(student_logits, teacher_logits, labels)
        
        # Backward pass
        self.optimizer.zero_grad()
        loss.backward()
        self.optimizer.step()
        
        return loss.item()
```

## Best Practices

1. **Memory Management**: Use gradient checkpointing for large models
2. **Mixed Precision**: Always use AMP for faster training
3. **Data Loading**: Optimize data pipeline with proper num_workers
4. **Reproducibility**: Set random seeds and use deterministic algorithms
5. **Monitoring**: Track metrics, gradients, and activations

## Performance Optimization

- Use torch.compile() for graph optimization (PyTorch 2.0+)
- Implement efficient data augmentation on GPU
- Use distributed data parallel for multi-GPU training
- Profile code with torch.profiler
- Optimize memory usage with gradient accumulation

## Related Agents

- **tensorflow-engineer**: For TensorFlow implementations
- **huggingface-specialist**: For transformer models
- **ml-engineer**: For general machine learning
- **cuda-programmer**: For custom CUDA kernels